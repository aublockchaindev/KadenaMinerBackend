(define-keyset 'kor-project-keyset (read-keyset "kor-project-keyset-xxxxxxxx"))


;(namespace "free") - For testing

(module kor-create-nft "kor-project-keyset" "Kor NFT project"


    ; The "key" for each entry in the table will be the NFT ID
    ; and the values fetched for each ID will be the owner, value, date
    (defschema owners-schema
        @doc "Stores the owner information for each nft"
        owner-address:string
	nft-value:string
	created-date:Time
    )


    (deftable nft-owners:{owners-schema})

    (defun set-owner(owner-address:string nft-id:string)
        @doc "Set the owner of an NFT - only available for admin"
     
        (enforce-keyset  (read-keyset "kor-project-keyset"))
        (insert nft-owners nft-id {"owner-address": owner-address})
    )
    (defun set-values(owner-address:string nft-id:string nft-value string created-date:Time)
        @doc "Set the values for NFT"
     
        (enforce-keyset  (read-keyset "kor-project-keyset"))
        (insert nft-owners nft-id {"owner-address": owner-address,"nft-value": nft-value,"created-date": created-date })
    )

    (defun get-owner (nft-id:string)
        @doc "Gets the owner of an NFT"
        
        (at "owner-address" (read nft-owners nft-id ['owner-address] ))
    )
    (defun get-nftvalue (nft-id:string)
        @doc "Gets the value of an NFT"
        
        (at "nft-value" (read nft-owners nft-id ['nft-value] ))
    )
    (defun get-createddate (nft-id:string)
        @doc "Gets the created date of an NFT"
        
        (at "created-date" (read nft-owners nft-id ['created-date] ))
    )


    (defun uri:string (id:string)
        @doc
        " Give URI for ID. If not supported, return \"\" (empty string)."

        ; This will take the url of the website you uplaoded your image to
        ; and then add the id and .jpg to the end of it

        (+ "https://your-website-url/"
            ; replace .jpg with the provided nft format
            (+ id ".jpg")
        )
    )
)

;create the table
(create-table nft-owners)
